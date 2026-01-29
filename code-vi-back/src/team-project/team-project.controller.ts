import { Controller, Post, Body, Logger, HttpStatus, Get, Param, NotFoundException } from '@nestjs/common';
import { TeamProjectService } from './team-project.service';
import { CreateTeamProjectAnalysisDto } from './dto/create-team-project.dto';
import { ApiResponseDto } from '../common/api-response-dto/api-response.dto';
import { TeamProjectResponseDto, TeamProjectResponseDtoWithAstData } from './dto/team-project-response.dto';

@Controller('team-projects')
export class TeamProjectController {
    private readonly logger = new Logger(TeamProjectController.name);

    constructor(private readonly teamProjectService: TeamProjectService) { }

    @Post()
    async createJenkinsNotification(
        @Body() dto: CreateTeamProjectAnalysisDto
    ): Promise<ApiResponseDto<void>> {
        const analysisData = dto.analysis;
        // this.logger.verbose(`Data Type: ${typeof analysisData.pyExamineResult}`);
        // this.logger.verbose(`Data Value: ${JSON.stringify(analysisData.pyExamineResult)}`);
        // this.logger.verbose(`Received analysis notification for Project: ${dto.jenkinsJobName}, Build: #${dto.analysis.buildNumber}`);
        await this.teamProjectService.createJenkinsNotification(dto);
        return new ApiResponseDto(true, HttpStatus.CREATED, 'Jenkins Notification received successfully');
    }

    @Get('/history')
    async getBuildHistory(): Promise<ApiResponseDto<TeamProjectResponseDto[]>> {
        const history = await this.teamProjectService.getAllBuildHistory();
        return new ApiResponseDto(true, HttpStatus.OK, 'Build history found.', history);
    }

    @Get(':projectId/:astId')
    async getTeamDataWithAstData(
        @Param('projectId') projectId: number,
        @Param('astId') astId: number
    ): Promise<ApiResponseDto<TeamProjectResponseDtoWithAstData>> {
        const teamData = await this.teamProjectService.getTeamDataWithAstData(projectId, astId);
        if (!teamData) {
            throw new NotFoundException(`Team Project with ID ${projectId} not found`);
        }
        return new ApiResponseDto(true, HttpStatus.OK, 'Team data Found.', new TeamProjectResponseDtoWithAstData(teamData));
    }
}